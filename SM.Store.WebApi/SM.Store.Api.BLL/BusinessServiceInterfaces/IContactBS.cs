using System.Collections.Generic;
using SM.Store.Api.Entities;
using SM.Store.Api.DAL;
using SM.Store.Api.Common;
using SM.Store.Api.Models;
using System;
using System.Threading.Tasks;

namespace SM.Store.Api.BLL
{
    public interface IContactBS
    {
        IList<Entities.Contact> GetContacts();
        Entities.Contact GetContactById(int id);
        int AddContact(Entities.Contact inputEt);
        void UpdateContact(Entities.Contact inputEt);
        void DeleteContact(int id);
    }

}