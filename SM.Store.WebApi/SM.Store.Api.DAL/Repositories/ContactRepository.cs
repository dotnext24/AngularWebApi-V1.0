using System;
using SM.Store.Api.Entities;
using System.Linq;
using System.Collections.Generic;
using SM.Store.Api.DAL;
using System.Data.Entity;
using SM.Store.Api.Common;
using SM.Store.Api.Models;
using System.Data.Entity.Infrastructure;
using System.Data.Entity.Core.Objects;

namespace SM.Store.Api.DAL
{
    public class ContactRepository : GenericRepository<Entities.Contact>, IContactRepository
    {
        public ContactRepository(IStoreDataUnitOfWork unitOfWork)
            : base(unitOfWork)
        {
        }

        public IList<Entities.Contact> GetContacts()
        {
            return this.GetAll();
        }

        public Entities.Contact GetContactById(int id)
        {
            return this.GetById(id);
        }

        public int AddContact(Entities.Contact inputEt)
        {
            inputEt.ContactID = 0;
            inputEt.AuditTime = DateTime.Now;
            this.Insert(inputEt);
            this.CommitAllChanges();
            return inputEt.ContactID;
        }

        public void UpdateContact(Entities.Contact inputEt)
        {
            //Get entity to be updated
            Entities.Contact updEt = GetContactById(inputEt.ContactID);

            if (!string.IsNullOrEmpty(inputEt.ContactName)) updEt.ContactName = inputEt.ContactName;
            if (!string.IsNullOrEmpty(inputEt.Phone)) updEt.Phone = inputEt.Phone;
            if (!string.IsNullOrEmpty(inputEt.Email)) updEt.Email = inputEt.Email;
            if (inputEt.PrimaryType != 0) updEt.PrimaryType = inputEt.PrimaryType;
            updEt.AuditTime = DateTime.Now;

            this.Update(updEt);
            this.CommitAllChanges();
        }

        public void DeleteContact(int id)
        {
            this.Delete(id);
            this.CommitAllChanges();
        }
    }
}
